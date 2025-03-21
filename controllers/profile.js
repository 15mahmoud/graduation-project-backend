const Profile = require('../models/profile');
const User = require('../models/user');
const CourseProgress = require('../models/courseProgress')
const Course = require('../models/course')
const SubSection = require("../models/subSection");


const { uploadImageToCloudinary, deleteResourceFromCloudinary } = require('../utils/imageUploader');
const { convertSecondsToDuration } = require('../utils/secToDuration')




// ================ update Profile ================
exports.updateProfile = async (req, res) => {
    try {
        // extract data
        const { gender = '', dateOfBirth = "", about = "", contactNumber = '',Linkedin = "", firstName, lastName } = req.body;

        // extract userId
        const userId = req.user.id;


        // find profile
        const userDetails = await User.findById(userId);
        const profileId = userDetails.additionalDetails;
        const profileDetails = await Profile.findById(profileId);

        // console.log('User profileDetails -> ', profileDetails);

        // Update the profile fields
        userDetails.firstName = firstName;
        userDetails.lastName = lastName;
        await userDetails.save()

        profileDetails.gender = gender;
        profileDetails.dateOfBirth = dateOfBirth;
        profileDetails.about = about;
        profileDetails.contactNumber = contactNumber;
        profileDetails.Linkedin = Linkedin;

        // save data to DB
        await profileDetails.save();

        const data = await User.findById(userId)
            .populate({
                path: 'additionalDetails'
            })
        // console.log('updatedUserDetails -> ', updatedUserDetails);

        // return response
        res.status(200).json({
            success: true,
            data,
            message: 'Profile updated successfully'
        });
    }
    catch (error) {
        console.log('Error while updating profile');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while updating profile'
        })
    }
}


// ================ delete Account ================
exports.deleteAccount = async (req, res) => {
    try {
        // extract user id
        const userId = req.user.id;
        // console.log('userId = ', userId)

        // validation
        const userDetails = await User.findById(userId);
        if (!userDetails) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // delete user profile picture From Cloudinary
        await deleteResourceFromCloudinary(userDetails.image);

        // if any student delete their account && enrollded in any course then ,
        // student entrolled in particular course sholud be decreae by one
        // user - courses - studentsEnrolled
        const userEnrolledCoursesId = userDetails.courses
        console.log('userEnrolledCourses ids = ', userEnrolledCoursesId)

        for (const courseId of userEnrolledCoursesId) {
            await Course.findByIdAndUpdate(courseId, {
                $pull: { studentsEnrolled: userId }
            })
        }

        // first - delete profie (profileDetails)
        await Profile.findByIdAndDelete(userDetails.additionalDetails);

        // second - delete account
        await User.findByIdAndDelete(userId);


        // sheduale this deleting account , crone job

        // return response
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        })
    }
    catch (error) {
        console.log('Error while updating profile');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while deleting profile'
        })
    }
}


// ================ get details of user ================
exports.getUserDetails = async (req, res) => {
    try {
        // extract userId
        const userId = req.user.id;
        console.log('id - ', userId);

        // get user details
        const userDetails = await User.findById(userId).populate('additionalDetails').exec();

        // return response
        res.status(200).json({
            success: true,
            data: userDetails,
            message: 'User data fetched successfully'
        })
    }
    catch (error) {
        console.log('Error while fetching user details');
        console.log(error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while fetching user details'
        })
    }
}



// ================ Update User profile Image ================
exports.updateUserProfileImage = async (req, res) => {
    try {
        const profileImage = req.files?.profileImage;
        const userId = req.user.id;

        // validation
        // console.log('profileImage = ', profileImage)

        // upload imga eto cloudinary
        const image = await uploadImageToCloudinary(profileImage,
            process.env.FOLDER_NAME, 1000, 1000);

        // console.log('image url - ', image);

        // update in DB 
        const updatedUserDetails = await User.findByIdAndUpdate(userId,
            { image: image.secure_url },
            { new: true }
        )
            .populate({
                path: 'additionalDetails'

            })

        // success response
        res.status(200).json({
            success: true,
            message: `Image Updated successfully`,
            data: updatedUserDetails,
        })
    }
    catch (error) {
        console.log('Error while updating user profile image');
        console.log(error);
        return res.status(500).json({
            success: false,
            error: error.message,
            message: 'Error while updating user profile image',
        })
    }
}




// ================ Get Enrolled Courses ================

exports.getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    let userDetails = await User.findOne({ _id: userId })
      .populate({
        path: "courses",
        select:
          "courseName courseDescription price thumbnail instructor studentsEnrolled",
      })
      .populate({
        path: "courses.instructor",
        select: "firstName lastName email image",
      })
      .exec();

    if (!userDetails) {
      return res.status(400).json({
        success: false,
        message: `Could not find user with id: ${userId}`,
      });
    }

    let uniqueCourses = new Map();

    for (let course of userDetails.courses) {
      let courseProgress = await CourseProgress.findOne({
        courseID: course._id,
        userId: userId,
      });

      let totalSubsections = await SubSection.countDocuments({
        course: course._id,
      });
      let completedVideos = courseProgress?.completedVideos.length || 0;

      course = course.toObject();
      course.progressPercentage =
        totalSubsections === 0
          ? 100
          : Math.round((completedVideos / totalSubsections) * 100 * 100) / 100;

      // إزالة التكرارات من studentsEnrolled
      course.studentsEnrolled = [
        ...new Set(course.studentsEnrolled.map((id) => id.toString())),
      ];

      uniqueCourses.set(course._id.toString(), course);
    }

    return res.status(200).json({
      success: true,
      data: Array.from(uniqueCourses.values()),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// exports.getEnrolledCourses = async (req, res) => {
//     try {
//         const userId = req.user.id
//         let userDetails = await User.findOne({ _id: userId, })
//             .populate({
//                 path: "courses",
//                 populate: {
//                     path: "courseContent",
//                     populate: {
//                         path: "subSection",
//                     },
//                 },
//             })
//             .exec()

//         userDetails = userDetails.toObject()

//         var SubsectionLength = 0
//         for (var i = 0; i < userDetails.courses.length; i++) {
//             let totalDurationInSeconds = 0
//             SubsectionLength = 0
//             for (var j = 0; j < userDetails.courses[i].courseContent.length; j++) {
//                 totalDurationInSeconds += userDetails.courses[i].courseContent[
//                     j
//                 ].subSection.reduce((acc, curr) => acc + parseInt(curr.timeDuration), 0)

//                 userDetails.courses[i].totalDuration = convertSecondsToDuration(totalDurationInSeconds)
//                 SubsectionLength += userDetails.courses[i].courseContent[j].subSection.length
//             }

//             let courseProgressCount = await CourseProgress.findOne({
//                 courseID: userDetails.courses[i]._id,
//                 userId: userId,
//             })

//             courseProgressCount = courseProgressCount?.completedVideos.length

//             if (SubsectionLength === 0) {
//                 userDetails.courses[i].progressPercentage = 100
//             } else {
//                 // To make it up to 2 decimal point
//                 const multiplier = Math.pow(10, 2)
//                 userDetails.courses[i].progressPercentage =
//                     Math.round((courseProgressCount / SubsectionLength) * 100 * multiplier) / multiplier
//             }
//         }

//         if (!userDetails) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Could not find user with id: ${userDetails}`,
//             })
//         }

//         return res.status(200).json({
//             success: true,
//             data: userDetails.courses,
//         })
//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: error.message,
//         })
//     }
// }




// ================ instructor Dashboard ================
exports.instructorDashboard = async (req, res) => {
    try {
        const courseDetails = await Course.find({ instructor: req.user.id })

        const courseData = courseDetails.map((course) => {
            const totalStudentsEnrolled = course.studentsEnrolled.length
            const totalAmountGenerated = totalStudentsEnrolled * course.price

            // Create a new object with the additional fields
            const courseDataWithStats = {
                _id: course._id,
                courseName: course.courseName,
                courseDescription: course.courseDescription,
                // Include other course properties as needed
                totalStudentsEnrolled,
                totalAmountGenerated,
            }

            return courseDataWithStats
        })

        res.status(200).json(
            {
                courses: courseData,
                message: 'Instructor Dashboard Data fetched successfully'
            },

        )
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Server Error" })
    }
}




// ================ get All Students ================
exports.getAllStudents = async (req, res) => {
    try {
        const allStudentsDetails = await User.find({
            accountType: 'Student'
        })
            .populate('additionalDetails')
            .populate('courses')
            .sort({ createdAt: -1 });


        const studentsCount = await User.countDocuments({
            accountType: 'Student'
        });


        res.status(200).json(
            {
                allStudentsDetails,
                studentsCount,
                message: 'All Students Data fetched successfully'
            },
        )
    } catch (error) {
        console.error(error)
        res.status(500).json({
            message: 'Error while fetching all students',
            error: error.message
        })
    }
}




// ================ get All Instructors ================
exports.getAllInstructors = async (req, res) => {
  try {
    const instructors = await User.find({
      accountType: "Instructor",
    })
      .populate("additionalDetails") // جلب بيانات الملف الشخصي
      .populate("courses", "courseName _id thumbnail") // تحديد بيانات الكورسات فقط
      .sort({ createdAt: -1 })
      .lean(); // تحويل المستندات إلى كائنات JavaScript عادية

    // دمج بيانات الملف الشخصي داخل كائن المدرب مباشرةً ثم حذف additionalDetails
    const data = instructors.map(({ additionalDetails, ...instructor }) => ({
      ...instructor, // جميع بيانات المدرب
      ...additionalDetails, // دمج بيانات الملف الشخصي مباشرةً داخل المدرب
    }));

    res.status(200).json({
      success: true,
      data, // إرجاع البيانات مباشرةً دون additionalDetails
      instructorsCount: data.length, // عدد المدربين
      message: "All Instructors Data fetched successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error while fetching all Instructors",
      error: error.message,
    });
  }
};



//  exports.getAllInstructors = async (req, res) => {
//    try {
//      const allInstructorsDetails = await User.find({
//        accountType: "Instructor",
//      })
//        .populate("additionalDetails")
//        .populate("courses")
//        .sort({ createdAt: -1 });

//      const instructorsCount = await User.countDocuments({
//        accountType: "Instructor",
//      });

//      res.status(200).json({
//        allInstructorsDetails,
//        instructorsCount,
//        message: "All Instructors Data fetched successfully",
//      });
//    } catch (error) {
//      console.error(error);
//      res.status(500).json({
//        message: "Error while fetching all Instructors",
//        error: error.message,
//      });
//    }
//  };





exports.saveCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.body;

    
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) {
      return res.status(404).json({
        success: false,
        message: "User or Course not found",
      });
    }

    
    const isSaved = user.savedCourses.includes(courseId);

    if (isSaved) {
      
      user.savedCourses = user.savedCourses.filter(
        (id) => id.toString() !== courseId
      );
    } else {
      
      user.savedCourses.push(courseId);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      data: isSaved
        ? "Course removed from saved list"
        : "Course saved successfully",
      isSaved: !isSaved, 
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// حفظ كورس معين للطالب
// exports.saveCourse = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { courseId } = req.body;

//     // التحقق من وجود المستخدم والكورس
//     const user = await User.findById(userId);
//     const course = await Course.findById(courseId);
    
//     if (!user || !course) {
//       return res.status(404).json({
//         success: false,
//         message: "User or Course not found",
//       });
//     }

//     // إضافة الكورس إلى قائمة الكورسات المحفوظة إذا لم يكن موجودًا بالفعل
//     if (!user.savedCourses.includes(courseId)) {
//       user.savedCourses.push(courseId);
//       await user.save();
//     }

//     return res.status(200).json({
//       success: true,
//       data: "Course saved successfully",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// جلب جميع الكورسات المحفوظة للطالب

exports.getSavedCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const userDetails = await User.findById(userId).populate({
      path: "savedCourses",
      select: "courseName courseDescription price thumbnail instructor",
      populate: {
        path: "instructor",
        select: "firstName lastName email image", // select the details of the instructor you need
      },
    });

    if (!userDetails) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: userDetails.savedCourses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};